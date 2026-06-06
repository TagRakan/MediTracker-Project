package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.AddAilmentRequest;
import com.MTA.V01.services.controllers.AilmentServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/ailment")
public class AilmentController {
    @Autowired
    AilmentServices ailmentServices;

    @PostMapping("/self/add")
    public ResponseEntity<?> addAilment(@RequestBody @Valid AddAilmentRequest addAilmentRequest){
        return ailmentServices.addAilment(addAilmentRequest);
    }

    @PostMapping("/self/update/{id}")
    public ResponseEntity<?> updateAilment(@PathVariable("id") Long ailmentId,@RequestBody @Valid AddAilmentRequest addAilmentRequest){
        return ailmentServices.updateAilment(ailmentId, addAilmentRequest);
    }

    @DeleteMapping("/self/delete/{id}")
    public ResponseEntity<?> removeAilment(@PathVariable("id") Long id){
        return ailmentServices.removeAilment(id);
    }

    @GetMapping("/self/get")
    public ResponseEntity<?> getSelfAilment(){
        return ailmentServices.getSelfAilment();
    }
}
