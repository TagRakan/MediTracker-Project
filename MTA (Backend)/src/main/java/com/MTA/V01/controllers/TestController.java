package com.MTA.V01.controllers;


import com.MTA.V01.models.User;
import com.MTA.V01.payload.response.UserResponseEntity;
import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/test")
public class TestController {
    @Autowired
    GeneralServices userServices;
    @Autowired
    UserRepository userRepository;

    @GetMapping("/whoami")
    public ResponseEntity<?> getUser(){
        User user = userServices.getSelf();
        return ResponseEntity.ok().body(user);
    }

    @GetMapping("/getid/{username}")
    public ResponseEntity<?> getIdFromUsername(@PathVariable("username") String username){
            if (!userRepository.existsByUsername(username)){
                return ResponseEntity.badRequest().body("user with username "+username+" doesn't exist");
            }
            return ResponseEntity.ok(userRepository.findByUsername(username).get().getId());
    }

    @GetMapping("/getusers/{pagenumber}/{pagesize}")
    public ResponseEntity<?> getUsers (@PathVariable("pagenumber") int pageNumber,@PathVariable("pagesize") int pageSize){
        Pageable limit = PageRequest.of(pageNumber,pageSize);

        Page<User> allUsers = userRepository.findAll(limit);

        List<UserResponseEntity> userResponseEntities = new ArrayList<>();

        allUsers.forEach(user ->{
            UserResponseEntity ure = new UserResponseEntity(
                    user.getId(),
                    user.getUsername(),
                    user.getDateOfBirth(),
                    user.getName(),
                    user.getRoles(),
                    user.getDoses(),
                    user.getPastDoses(),
                    user.getFamily(),
                    user.getPatients(),
                    user.getDoctors(),
                    user.getMedicine()
            );
            userResponseEntities.add(ure);
        });
        return ResponseEntity.ok(userResponseEntities);
    }
}
