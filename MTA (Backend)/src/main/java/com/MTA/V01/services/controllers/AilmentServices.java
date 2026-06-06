package com.MTA.V01.services.controllers;

import com.MTA.V01.models.Ailment;
import com.MTA.V01.models.AilmentType;
import com.MTA.V01.models.User;
import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.payload.requests.AddAilmentRequest;
import com.MTA.V01.repositories.AilmentRepository;
import com.MTA.V01.repositories.enumRepos.AilmentStatusRepository;
import com.MTA.V01.services.general.AilmentTypeServices;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class AilmentServices {
    @Autowired
    GeneralServices generalServices;

    @Autowired
    AilmentRepository ailmentRepository;

    @Autowired
    AilmentStatusRepository ailmentStatusRepository;

    @Autowired
    AilmentTypeServices ailmentTypeServices;

    @Autowired
    LogServices logServices;

    public ResponseEntity<?> addAilment(AddAilmentRequest addAilmentRequest){
        AilmentStatus status = ailmentStatusRepository.findByName(EAilmentStatus.valueOf(addAilmentRequest.getAilmentStatus()))
                .orElseThrow(()-> new RuntimeException("Ailment status is missing/wrong"));
        User user = generalServices.getSelf();
        AilmentType ailmentType = ailmentTypeServices.findAilmentTypeById(addAilmentRequest.getAilmentType());

        Ailment ailment = new Ailment(addAilmentRequest.getAilmentName(),status,ailmentType);
        ailment.setUser(user);

        logServices.addLog("User "+generalServices.getSelf()+" made ailment "+ ailment);
        ailmentRepository.save(ailment);
        return ResponseEntity.ok("saved ailment successfully");
    }

    public ResponseEntity<?> updateAilment(Long id, AddAilmentRequest addAilmentRequest){
        AilmentStatus status = ailmentStatusRepository.findByName(EAilmentStatus.valueOf(addAilmentRequest.getAilmentStatus()))
                .orElseThrow(()-> new RuntimeException("Ailment status is missing/wrong"));
        User user = generalServices.getSelf();
        AilmentType ailmentType = ailmentTypeServices.findAilmentTypeById(addAilmentRequest.getAilmentType());

        Ailment ailment = new Ailment(addAilmentRequest.getAilmentName(),status,ailmentType);
        ailment.setUser(user);
        ailment.setId(id);

        logServices.updateLog("User "+generalServices.getSelf()+" updated ailment "+ailment);
        ailmentRepository.save(ailment);
        return ResponseEntity.ok("updated ailment successfully");
    }

    public ResponseEntity<?> removeAilment(Long id){
        if (!ailmentRepository.existsById(id)){
            return ResponseEntity.badRequest().body("ailment with id "+ id+" does not exist");
        }

        if (!generalServices.getSelf().getId().equals(ailmentRepository.findById(id).get().getUser().getId())){
            return ResponseEntity.badRequest().body("Not authorized to delete this ailment");
        }
        logServices.deleteLog("User "+generalServices.getSelf()+" deleted ailment "+ ailmentRepository.findById(id));
        ailmentRepository.deleteById(id);
        return ResponseEntity.ok("successfully deleted the ailment");
    }

    public ResponseEntity<?> getSelfAilment(){
        return ResponseEntity.ok(generalServices.getSelf().getAilmentList());
    }


    //the next section until the end is for doctors
    public ResponseEntity<?> getUserAilments(Long id){
        User user = generalServices.getUser(id);
        if (user==null){
            return ResponseEntity.badRequest().body("user with ID "+ id+" doesn't exist");
        }
        return ResponseEntity.ok(user.getAilmentList());
    }

    public ResponseEntity<?> addUserAilment(Long userId, AddAilmentRequest addAilmentRequest){
        AilmentStatus status = ailmentStatusRepository.findByName(EAilmentStatus.valueOf(addAilmentRequest.getAilmentStatus()))
                .orElseThrow(()-> new RuntimeException("Ailment status is missing/wrong"));

        User user = generalServices.getUser(userId);
        if (user==null){
            return ResponseEntity.badRequest().body("user with id "+ userId+" does not exist");
        }

        AilmentType ailmentType = ailmentTypeServices.findAilmentTypeById(addAilmentRequest.getAilmentType());

        Ailment ailment = new Ailment(addAilmentRequest.getAilmentName(),status,ailmentType);

        ailment.setUser(user);

        logServices.addLog("User "+generalServices.getSelf()+" added ailment "+ailment+" to user "+user);
        ailmentRepository.save(ailment);
        return ResponseEntity.ok("saved ailment for user "+user.getName()+" successfully");
    }

    public ResponseEntity<?> updateUserAilment(Long ailmentId,Long userId, AddAilmentRequest addAilmentRequest){
        AilmentStatus status = ailmentStatusRepository.findByName(EAilmentStatus.valueOf(addAilmentRequest.getAilmentStatus()))
                .orElseThrow(()-> new RuntimeException("Ailment status is missing/wrong"));

        User user = generalServices.getUser(userId);
        if (user==null){
            return ResponseEntity.badRequest().body("user with id "+ userId+" does not exist");
        }
        AilmentType ailmentType = ailmentTypeServices.findAilmentTypeById(addAilmentRequest.getAilmentType());

        Ailment ailment = new Ailment(addAilmentRequest.getAilmentName(),status,ailmentType);
        ailment.setUser(user);
        ailment.setId(ailmentId);

        logServices.updateLog("user "+generalServices.getSelf()+" updated ailment to "+ailment+"for user "+user);
        ailmentRepository.save(ailment);
        return ResponseEntity.ok("updated ailment successfully");
    }

    public ResponseEntity<?> removeUserAilment(Long ailmentId){
        if (ailmentRepository.existsById(ailmentId)){
            logServices.deleteLog("user "+ generalServices.getSelf()+" removed ailment "+ailmentRepository.findById(ailmentId)+" for user "+ailmentRepository.findById(ailmentId).get().getUser());
            ailmentRepository.deleteById(ailmentId);
            return ResponseEntity.ok("ailment deleted successfully");
        }
        return ResponseEntity.badRequest().body("No ailment exists with Id "+ailmentId);
    }

}
